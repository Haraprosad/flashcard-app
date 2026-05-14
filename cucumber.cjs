module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    import: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts', 'features/step_definitions/**/*.tsx'],
    format: ['progress', 'html:reports/cucumber.html'],
    formatOptions: { snippetInterface: 'async-await' },
  },
}
