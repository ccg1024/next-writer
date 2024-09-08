const fs = require('fs')
const path = require('path')

const COMMENT_INFO = `// ==================================================
// ================ Generate by Shell ===============
// ==================================================

`

/**
 * Read different preset configuration files according to different enviroments.
 *
 * @param env Current enviroment
 */
function preset(env = 'DEV') {
  const filePath = path.join(
    __dirname,
    `../server/index.${env.toLowerCase()}.js`
  )
  const targetPath = path.join(__dirname, `../index.es.js`)
  fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
    if (err) {
      global.console.error(`Read file ${filePath} occur error!!!`)
      global.console.error(err.message)
      return
    }
    if (data) {
      global.console.log('[next-writer] Begin to write preset config file !!!')
      global.console.log('[next-writer] Begin to write preset config file !!!')
      global.console.log('')
      fs.writeFile(
        targetPath,
        COMMENT_INFO + data,
        { encoding: 'utf8' },
        err => {
          if (err) {
            global.console.error(`Write file ${targetPath} occur error !!!`)
            global.console.error(err.message)
          }
        }
      )
    }
  })
}

// Get command line arg
const [, , env] = process.argv
preset(env)
