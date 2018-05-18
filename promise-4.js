/**
 * 问题: 值的穿透： then 的链式调用中，中间一个 then 没有传入的不是一个方法，导致后续的 then 无法拿到之前 then 的返回值
 *    处理方式: 修改 then 中
 *    var onResolved = typeof onResolved === 'function' ? onResolved : function (value) { return value }
 *    var onRejected = typeof onRejected === 'function' ? onRejected : function (value) { throw value }
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


Promise.prototype.then = function (onResolved, onRejected) {

    var self = this
    var promise2

    // 标准规定: 如果 then 的参数不是函数，则需要忽略
    var onResolved = typeof onResolved === 'function' ? onResolved : function (value) { return value }
    var onRejected = typeof onRejected === 'function' ? onRejected : function (value) { throw value }

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
     return res + '(then1 resolve 之后返回)'
 }, function (reason) {
    console.log(reason);
    return res + '(then1 reject 之后返回)'
 }).then(function (res) {
     console.log('then2: ' + res);
     return res + ' then2 resolve 之后返回'
     /**
      *  此时 res 两种情况: 取决于上个 then 的返回，上个 then 取决于 resolve 或者 reject
      *  当 resolve 时， res = hello, world!(then1 resolve 之后返回)
      *  当 reject 时，  res = hello, world!(then1 reject 之后返回)
      */
 }).then('直接传了一个值，不是fn') // 这个传入的将被忽略，这个 then 将返回上个 then 的返回值即 hello, world!(then1 resolve 之后返回) then2 resolve 之后返回
 .then(function (res) {
     console.log('then4: ' + res); // res = hello, world!(then1 resolve 之后返回) then2 resolve 之后返回
 })
