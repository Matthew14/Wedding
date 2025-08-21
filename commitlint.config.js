module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of these
    'type-enum': [
      2,
      'always',
      [
        'build',   // Changes that affect the build system or external dependencies
        'chore',   // Other changes that don't modify src or test files
        'ci',      // Changes to CI configuration files and scripts
        'docs',    // Documentation only changes
        'feat',    // A new feature
        'fix',     // A bug fix
        'perf',    // A code change that improves performance
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'revert',  // Reverts a previous commit
        'style',   // Changes that do not affect the meaning of the code (formatting, etc)
        'test',    // Adding missing tests or correcting existing tests
      ],
    ],
    // Subject must be lowercase
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    // Subject must not end with a period
    'subject-full-stop': [2, 'never', '.'],
    // Subject must not be empty
    'subject-empty': [2, 'never'],
    // Type must not be empty
    'type-empty': [2, 'never'],
    // Type must be lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Header (first line) must not be longer than 72 characters
    'header-max-length': [2, 'always', 72],
  },
};
