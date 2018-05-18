/**
 * promise 构造函数内部的 resolve 方法使用 setTimeout 将回调函数放到执行队列末尾，使 then 先执行
 *
 * 异步操作执行成功之后，回调函数需要其结果，因此在 Promise 构造函数内部的 resolve 方法加上参数
 *
 * Promise 有三个状态 pending、fulfilled 和 rejected
 * 加入状态: pending: 等待   fulfilled: 成功    rejected: 失败
 *
 */
 function Promise (executor) {

     var self = this

     self.resolvedCallback // 定义 fulfilled 状态的回调
     self.rejectedCallback // 定义 rejected 状态的回调
     
     self.status = 'pending' // 初始状态为 pending

     self.then = function (onResolved, onRejected) { // 通过 then 方法接受开发者以参数传入的业务函数(done)，作为成功之后的回调
         self.resolvedCallback = onResolved
         self.rejectedCallback = onRejected
     }


     function resolve (value) { // 定义内部的 resolve 函数，作为函数executor 的参数,
         setTimeout(function () {
             if (self.status === 'pending') {
                 self.status = 'fulfilled'; // 调用成功的回调的时候 将 Promise 状态改为 fulfilled
                 self.resolvedCallback(value)
             }
         }, 0)
     }


     function reject (value) {
         setTimeout(function () {
             if (self.status === 'pending') { // 调用失败的回调的时候 将 Promise 状态改为 rejected
                 self.status = 'rejected';
                 self.rejectedCallback(value)
             }
         }, 0)
     }

     // executor 函数在执行过程中也可能出错，开发者编码错误，所以这里手动 try-catch 一下，如果有错误，直接 reject 这个 Promise
     try {
         executor(resolve, reject) // 调用函数executor
     } catch (e) {
         reject(e)
     }
 }


new Promise(function (resolve, reject) {
    // 异步操作...  成功的回调函数可能需要其结果，所以已参数形式返回
    let res = 'hello, world!'
    // console.log(x);
    resolve(res)
}).then(function (res) { // 接受结果
    console.log(res)
}, function (err) { // 接受结果
    console.log(new Error(err))
})
