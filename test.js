
new Promise(function (resolve, reject) {
  resolve() // reject()
}).then(function () {
  console.log('success');
}, function () {
  console.log(new Error('fail'))
})
