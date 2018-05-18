/**
 * 核心的 Promises/A+ 规范不设计如何创建、解决和拒绝 promise，而是专注于提供一个通用的 then 方法。
 * thenable 一个定义了 then 方法的对象或函数
 * 不同 Promise 交互
 */

 function Promise (executor) {

     var self = this

     self.resolves = []
     self.rejects = []
     self.status = 'pending'
     self.result

     function resolve (value) {
       if (value instanceof Promise) {
          return value.then(resolve, reject)
        }
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

     function reject (reason) {
         setTimeout(function () {
             if (self.status === 'pending') {
                 self.status = 'rejected'
                 self.result = reason
                 self.rejects.forEach(function (e) { // 循环执行 rejects 数组中的函数，即  promise 失败状态下，执行 依次失败队列中的函数
                     e(reason)
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
 * promise2 的取值取决于 promise1.then 的返回值
 * 因此我们需要在 then 中执行 onResolved 或者 onRejected，并根据返回值来确定 promise2 的结果
 * 如果 onResolved 或者 onRejected 返回的是一个 Promise，promise2 则直接取这个 Promise 的结果
 */
Promise.prototype.then = function (onResolved, onRejected) {

    var self = this
    var promise2

    // 标准规定: 如果 then 的参数不是函数，则需要忽略
    onResolved = typeof onResolved === 'function' ? onResolved : function (value) { return value }
    onRejected = typeof onRejected === 'function' ? onRejected : function (value) { throw value }

    /**
     * 分三种状态判断
     * 当前 promise 即 this/self 的状态为 fulfilled，则直接调用 onResolved
     * 考虑到有可能 throw，将其抱在try-catch中，如果 throw 直接 reject
     */
    if (self.status === 'fulfilled') {
        return promise2 = new Promise(function (resolve, reject) {
          setTimeout(function () {
            try {
                var x = onResolved(self.result)
                resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
                reject(e) // 如果出错，以捕获到的错误作为 Promise2 的返回值
            }
          }, 0)
        })
    }

    /**
     * 当前 Promise 状态为 rejected, 则直接 onRejected
     */
    if (self.status === 'rejected') {
        return promise2 = new Promise(function (resolve, reject) {
          setTimeout(function () {
            try {
                var x = onRejected(self.result)
                resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
                reject(e)
            }
          }, 0)
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
            var x = onResolved(value)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
        // 给 rejects 队列添加一个 fn， 内部执行 reject
        self.rejects.push(function (reason) {
          try {
            var x = onRejected(reason)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      })
    }
}



/**
 * Promise/A+ 规范:
 * 1: x 与 promise 相等, 以 TypeError 为拒因拒绝执行 promise
 *
 * 2: x 为 Promise
 *    ① x 为 pending, promise 需要保持状态直至 x 被执行或拒绝
 *    ② x 为 fulfilled, 用相同的值执行 promise
 *    ③ x 为 rejected, 用相同的拒因拒绝 promise
 * 3: x 为对象或者函数
 *    ① 把 x.then 赋值给 then
 *    ② 如果 x.then 抛出错误 error, 则以 error 为拒因拒绝 promise
 *    ③ 如果 then 为函数，将x 作为函数的作用域 this 调用。传递两个回调函数作为参数：resolvePromise 和 rejectPromise
 *        如果 resolvePromise 以值 y 为参数被调用
 *        如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
 *        如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
 *        如果调用 then 方法抛出了异常 e:
 *          如果 resolvePromise 或 rejectPromise 已经被调用，则忽略之
 *          否则以 e 为据因拒绝 promise
 *        如果 then 不是函数，以 x 为参数执行 promise
 *    ④ 如果 x 不为对象或者函数，以 x 为参数执行 promise
 *
 * 我们要把onResolved/onRejected的返回值，x，当成一个可能是Promise的对象，也即标准里所说的thenable，
 * 并以最保险的方式调用x上的then方法，如果大家都按照标准实现，那么不同的Promise之间就可以交互了。
 * 而标准为了保险起见，即使x返回了一个带有then属性但并不遵循Promise标准的对象
 * 比如说这个x把它then里的两个参数都调用了，同步或者异步调用（PS，原则上then的两个参数需要异步调用，下文会讲到，
 * 或者是出错后又调用了它们，或者then根本不是一个函数），也能尽可能正确处理。
 *
 *
 *
 */


function resolvePromise (promise, x, resolve, reject) {

  var then
  var thenError = false
  // 对应上述 1
  if (promise === x) {
    return reject(new TypeError('返回的不是一个新的 Promise 对象'))
  }
  // 对应上述 2
  if (x instanceof Promise) {
    if (x.status === 'pending') {
      x.then(function (value) {
        resolvePromise(promise, value, resolve, reject)
      }, reject)
    } else {
      x.then(resolve, reject)
    }
    return
  }

  // 对应上述 3
  if ((x !== null) && ((typeof x === 'object') || (typeof x === 'function'))) {
    try {
      then = x.then
      if (typeof then === 'function') {
        then.call(x, function (y) {
          if (thenError) return // then 方法多次调用
          thenError = true
          return resolvePromise(promise, y, resolve, reject)
        }, function (r) {
          if (thenError) return // then 方法多次调用
          thenError = true
          return reject(r)
        })
      } else {
        resolve(x)
      }
    } catch (e) {
      if (thenError) return // then 方法多次调用
      thenError = true
      return reject(e)
    }
  } else {
    resolve(x)
  }
}


/**
 * catch 方法
 */
Promise.prototype.catch = function(onRejected) {
  return this.then(null, onRejected)
}

/**
 * resolve 方法
 */
Promise.resolve = function(value) {
  var promise = new Promise(function(resolve, reject) {
    resolvePromise(promise, value, resolve, reject)
  })
  return promise
}

/**
 * reject 方法
 */
Promise.reject = function(reason) {
  return new Promise(function(resolve, reject) {
    reject(reason)
  })
}

/**
 * all 方法
 */

Promise.all = function(promises) {
  return new Promise(function(resolve, reject) {
    var resolvedNum = 0
    var promiseNum = promises.length
    var resolvedValues = new Array(promiseNum)
    for (var i = 0; i < promiseNum; i++) {
      (function(i) {
        Promise.resolve(promises[i]).then(function(value) {
          resolvedNum++
          resolvedValues[i] = value
          if (resolvedNum == promiseNum) {
            return resolve(resolvedValues)
          }
        }, function(reason) {
          return reject(reason)
        })
      })(i)
    }
  })
}

/**
 * race 方法
 */

Promise.race = function(promises) {
  return new Promise(function(resolve, reject) {
    for (var i = 0; i < promises.length; i++) {
      Promise.resolve(promises[i]).then(function(value) {
        return resolve(value)
      }, function(reason) {
        return reject(reason)
      })
    }
  })
}


//
// new Promise(function (resolve, reject) {
//     // 异步操作...  成功的回调函数可能需要其结果，所以已参数形式返回
//     var res = 'hello, world!'
//     resolve(res)
// }).then(function (res) { // 接受结果
//     console.log('then1: ' + res)
//     console.log(xxx); // xxx 不存在
//     return res + ' 哈哈'
// }).then(function (res) {
//     console.log('then2: ' + res);
// }).catch(function (error) {
//   console.log('catch: then1-error: ' + error);
// })


// new Promise(function (resolve, reject) {
//     // 异步操作...  成功的回调函数可能需要其结果，所以已参数形式返回
//     var res = 'hello, world!'
//     reject(res)
// }).then(function (res) { // 接受结果
//     console.log('then1: ' + res)
//     // console.log(xxx); // xxx 不存在
//     throw new Error('错了')
//     return res + ' 哈哈'
// }, function (e) {
//   console.log('then1-error: ' + e);
//   return '---' + e;
// }).then(function (res) {
//     console.log('then2: ' + res);
// }, function (e) {
//   console.log('then2-error: ' + e);
// })



// new Promise(function (resolve, reject) {
//     // 异步操作...  成功的回调函数可能需要其结果，所以已参数形式返回
//     var res = 'hello, world!'
//     // console.log(xxxx);
//     resolve(res)
// }).then(function (res) { // 接受结果
//     console.log('then1: ' + xxx)
//     return res + ' 哈哈'
// }, function (e) {
//   console.log('then1-error: ' + e);
//   return '---' + e;
// })
// .catch(function (error) {
//   console.log('catch: then1-error: ' + error);
// })




var p1 = new Promise(function (resolve, reject) {
    resolve(1)
}).then(function (res) { // 接受结果
    console.log('p1: ' + res)
    return res
}, function (e) {
  console.log('then1-error: ' + e);
})

var p2 = new Promise(function (resolve, reject) {
    resolve(2)
}).then(function (res) { // 接受结果
    console.log('p2: ' + res)
    return res
}, function (e) {
  console.log('then1-error: ' + e);
})

var p3 = new Promise(function (resolve, reject) {
    resolve(3)
}).then(function (res) { // 接受结果
    console.log('p3: ' + res)
    return res
}, function (e) {
  console.log('then1-error: ' + e);
})


Promise.all([p1, p2, p3]).then(function (arr) {
  console.log(arr);
}).catch(function (e) {
  console.log(e);
})


Promise.resolve(1212).then(function (e) {
  console.log(3);
})
