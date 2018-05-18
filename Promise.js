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

Promise.prototype.then = function (onResolved, onRejected) {

    var self = this
    var promise2

    onResolved = typeof onResolved === 'function' ? onResolved : function (value) { return value }
    onRejected = typeof onRejected === 'function' ? onRejected : function (value) { throw value }

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

// 插件测试
Promise.deferred = Promise.defer = function() {
  var dfd = {}
  dfd.promise = new Promise(function(resolve, reject) {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

module.exports = Promise
