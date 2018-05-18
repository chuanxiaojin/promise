 /**
  * 首先实现一个简单的创建 Promise 对象的构造函数
  *
  * 1. Promise 的参数是一个函数，这个函数的参数又有两个参数，一个 resolve, 另一个 reject，分别执行个子状态的回调
  * 2. Promise 实例生成之后，通过 then 方法注册 fulfilled 和 rejected 状态的回调函数
  *
  * 简单说明: 定义内部的 resolve 函数，作为 executor 函数的参数，调用函数 executor，当异步操作执行执行成功之后会调用 内部定义的 resolve 方法，
  *          从而执行 resolvedCallback 方法，即 then 方法参数的 done 方法
  */
function Promise (executor) {

    var resolvedCallback // 定义 fulfilled 状态的回调
    var rejectedCallback // 定义 rejected 状态的回调

    this.then = function (onResolved, onRejected) { // 通过 then 方法接受开发者以参数传入的业务函数(done)，作为成功之后的回调
        resolvedCallback = onResolved
        rejectedCallback = onRejected
    }

    function resolve () { // 定义内部的 resolve 函数，作为函数executor 的参数,
        resolvedCallback()
    }

    function reject () {
        rejectedCallback()
    }

    executor(resolve, reject) // 调用函数executor
}

/**
 * 报错: resolvedCallback is not a function
 * 原因: 传入的是一个不包含异步操作的函数，则 resolve 就会先于 then 执行，到时 resolvedCallback 值为 undefined
 */
new Promise(function (resolve, reject) {
    // resolve()
}).then(function () {
    console.log('success');
}, function () {
    console.log(new Error('fail'))
})


/**
 * 传入异步操作正常执行
 */
new Promise(function (resolve, reject) {
    setTimeout(() => {
        resolve()
    }, 0)
}).then(function () {
    console.log('success');
}, function () {
    console.log(new Error('fail'))
})
