const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')
module.exports = defineConfig({
  transpileDependencies: true,
  
  // 配置相对路径，解决部署到子目录时的资源加载问题
  publicPath: './',
  
  // 配置生产环境构建
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
      })
    ],
    optimization: {
      splitChunks: {
        chunks: 'all'
      }
    }
  }
})
