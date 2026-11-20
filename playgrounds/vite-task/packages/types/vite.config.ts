export default {
  run: {
    tasks: {
      build: {
        command: 'node ../../scripts/task.mjs build',
        dependsOn: [],
        cache: {
          input: [
            {
              auto: false,
            },
            'src/**',
            '../../scripts/*.mjs',
            'package.json',
          ],
          output: [
            'dist/**',
          ],
        },
      },
      typecheck: {
        command: 'node ../../scripts/task.mjs typecheck',
        dependsOn: [
          'build',
        ],
        cache: {
          input: [
            {
              auto: false,
            },
            'dist/index.*',
            '../../scripts/*.mjs',
          ],
          output: [
            'dist/results/typecheck.json',
          ],
        },
      },
      test: {
        command: 'node ../../scripts/task.mjs test',
        dependsOn: [
          'build',
        ],
        cache: {
          input: [
            {
              auto: false,
            },
            'dist/index.*',
            '../../scripts/*.mjs',
          ],
          output: [
            'dist/results/test.json',
          ],
        },
      },
      clean: {
        command: 'node ../../scripts/task.mjs clean',
        cache: false,
      },
    },
  },
}
