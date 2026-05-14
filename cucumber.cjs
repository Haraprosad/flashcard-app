module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress', 'html:reports/cucumber.html'],
    formatOptions: { snippetInterface: 'async-await' },
  },
}
