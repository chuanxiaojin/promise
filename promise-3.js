/**
 * 加入链式形式
 * 所谓链式结果即 then 方法后面再次调用 then...
 * 实现链式 then 方法的调用，需要确保调用 then 方法之后继续返回 一个新的 promise 对象
 * 链式调用之后，成功的回调就需要数组才能储存
 * 将 then 方法拉出写在原型链上
 */

 function Promise (executor) {

     var self = this

     self.resolves = [] // 定义 fulfilled 状态的回调
     self.rejects = [] // 定义 rejected 状态的回调
     self.status = 'pending'
     self.result // 存储返回值, 串式调用方便使用

     function resolve (value) {
         setTimeout(function () {
             if (self.status === 'pending') {
                 self.status = 'fulfilled'
                 self.result = value
                 self.resolves.forEach(function (e) { // 循环执行 resolves 数组中的函数, 即  promise 成功状态下，执行 依次成功队列中的函数
                     e(value)
                 })
             }
         }, 0)
     }

     function reject (value) {
         setTimeout(function () {
             if (self.status === 'pending') {
                 self.status = 'rejected'
                 self.result = value
                 self.rejects.forEach(function (e) { // 循环执行 rejects 数组中的函数，即  promise 失败状态下，执行 依次失败队列中的函数
                     e(value)
                 })
             }
         }, 0)
     }


     try {
         executor(resolve, reject) // 调用函数executor
     } catch (e) {
         reject(e)
     }
 }


/**
 * 根据标准，then 方法可串式调用，并且 必须返回一个新的 Promise 对象，不可以是当前的 Promise 对象，因此不可以 return this.
 * 需要 return new Promise()
 *
 * 每次调用 then 方法返回的 Promise 的状态取决于调用这次 then 方法时传入参数的返回值，每次返回都有可能不同，所以这个 Promise 的状态也分三种
 *
 * 1. promise2 = promise1.then(function () {
 *      return 1;
 * }, function () {
 *      throw new Error('出错啦!!!')
 * })
 *
 * 以上说明: 如果  promise1 状态为 resolved, 则 promise2 将被 1 resolve
 *          否则  promise1 的状态为 rejected, 则 promise2 将被 new Error('出错啦!!!')，此时 then 返回一个新的 Promise，其 throw 因此 promise2 被 rejected
 *
 * 2. promise2 = promise1.then(function () {
 *      return 1;
 * }, function (error) {
 *      console.log(x) // x is not defined
 * })
 *
 * 以上说明: 如果  promise1 状态为 resolved, 则 promise2 将被 1 resolve
 *          否则  promise1 状态为 rejected, 则 promise2 将被 x is not defined rejected，此时 then 返回一个新的 Promise，其 运行报错
 *
 * 3. promise2 = promise1.then(function () {
 *      console.log(x) // x is not defined
 *      return 1;
 * }, function (error) {
 *      return error  // error
 * })
 *
 * 以上说明: 如果  promise1 状态为 resolved, 则 promise2 将被 x is not defined  rejected
 *          否则  promise1 状态为 rejected, 则 promise2 将被 [error] resolved
 *
 *
 * promise2 的取值取决于 promise1.then 的返回值
 * 因此我们需要在 then 中执行 onResolved 或者 onRejected，并根据返回值来确定 promise2 的结果
 * 如果 onResolved 或者 onRejected 返回的是一个 Promise，promise2 则直接取这个 Promise 的结果
 */
Promise.prototype.then = function (onResolved, onRejected) {

    var self = this
    var promise2

    // 标准规定: 如果 then 的参数不是函数，则需要忽略, 这样处理
    var onResolved = typeof onResolved === 'function' ? onResolved : function () {}
    var onRejected = typeof onRejected === 'function' ? onRejected : function () {}

    /**
     * 分三种状态判断
     * 当前 promise 即 this/self 的状态为 fulfilled，则直接调用 onResolved
     * 考虑到有可能 throw，将其抱在try-catch中，如果 throw 直接 reject
     */
    if (self.status === 'fulfilled') {
        return promise2 = new Promise(function (resolve, reject) {
            try {
                var promise2Result = onResolved(self.result)
                if (promise2Result instanceof Promise) { // 如果 promise2Result 是一个 Promise, 则直接取其返回值作为 promise2 的结果
                    promise2Result.then(resolve, reject)
                }
                resolve(promise2Result) // 不是一个 Promise 则以其返回值作为 Promise2 的结果
            } catch (e) {
                reject(promise2Result) // 如果出错，以捕获到的错误作为 Promise2 的返回值
            }
        })
    }

    /**
     * 当前 Promise 状态为 rejected, 则直接 onRejected
     */
    if (self.status === 'rejected') {
        return promise2 = new Promise(function (resolve, reject) {
            try {
                var promise2Result = onRejected(self.result)
                if (promise2Result instanceof Promise) { // 如果 promise2Result 是一个 Promise, 则直接取其返回值作为 promise2 的结果
                    promise2Result.then(resolve, reject)
                }
                reject(promise2Result)
            } catch (e) {
                reject(promise2Result)
            }
        })
    }

    /**
     * 如果当前的 Promise 状态还处于 pending, 我们并不能确定调用 onResolved 或 onRejected
     * 必须等到其状态确定后才能确定如何处理
     * 所以我们需要把其状态的处理逻辑以 callback 放入 this/self 的回调数组中
     */

    if (self.status === 'pending') {
      return promise2 = new Promise(function (resolve, reject) {
        // 给 resolves 队列添加一个 fn， 内部执行 resolve
        self.resolves.push(function (value) {
          try {
            var x = onResolved(self.result)
            if (x instanceof Promise) {
              x.then(resolve, reject)
            }
            resolve(x)
          } catch (e) {
            reject(e)
          }
        })
        // 给 rejects 队列添加一个 fn， 内部执行 reject
        self.rejects.push(function (reason) {
          try {
            var x = onRejected(self.result)
            if (x instanceof Promise) {
              x.then(resolve, reject)
            }
            reject(x)
          } catch (e) {
            reject(e)
          }
        })
      })
    }
};




new Promise(function (resolve, reject) {
    // 异步操作...  成功的回调函数可能需要其结果，所以已参数形式返回
    var res = 'hello, world!'
    resolve(res)
}).then(function (res) { // 接受结果
    console.log('then1: ' + res)
    return res + ' 哈哈'
}, function (reason) {
  console.log(reason);
}).then(function (res) {
    console.log('then2: ' + res);
})


// .then('直接传了一个值，不是fn')
// .then(function (res) {
//     console.log('then4: ' + res);
// })
// 至此，基本的 Promise 已经实现
