import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Shared flat config. `react: true` adds hooks + refresh rules.
 * Business logic must not live in UI components: UI packages must not import from apps.
 */
export function createConfig({ react = false } = {}) {
  return defineConfig([
    globalIgnores(['dist', 'coverage']),
    {
      files: ['**/*.{ts,tsx}'],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        ...(react ? [reactHooks.configs.flat.recommended, reactRefresh.configs.vite] : []),
      ],
      languageOptions: { globals: globals.browser },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        eqeqeq: ['error', 'always'],
      },
    },
  ])
}
