import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import react from "eslint-plugin-react";
import tseslint from "typescript-eslint";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import importPlugin from "eslint-plugin-import";
import tailwind from "eslint-plugin-tailwindcss";
import checkFile from "eslint-plugin-check-file";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  {
    ignores: [
      "dist", 
      "node_modules", 
      "capacitor.config.ts", 
      "vite.config.ts", 
      "vitest.config.ts", 
      "tests/visual/**",
      "src/components/ui/**"
    ]
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "react": react,
      "@tanstack/query": tanstackQuery,
      "import": importPlugin,
      "tailwindcss": tailwind,
      "check-file": checkFile,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...jsxA11y.configs.recommended.rules,
      ...tanstackQuery.configs.recommended.rules,
      
      "react/prop-types": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      
      // Strict Type Safety
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_", 
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "error",
      
      // Async Safety (Dexie Support)
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          "checksVoidReturn": false
        }
      ],
      
      "react-hooks/exhaustive-deps": "error",
      "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
      
      // Internationalization (i18n)
      "react/jsx-no-literals": ["warn", { 
        "noStrings": true,
        "allowedStrings": [
          "-", ":", "(", ")", "/", "|", "+", "*", "=", ">", "<", "!", "&", " ", "…", "...", 
          "·", "×", "%", "—", "–", "✓", "✕", "←", "→", ",", ".", "#", "±", "@",
          "(s)", "(kg)", "(±", ": +", "%)", "x",
          "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
        ],
        "ignoreProps": true 
      }],
      
      // Import Sorting
      "import/order": [
        "error",
        {
          "groups": ["builtin", "external", "internal", ["parent", "sibling"], "index", "object", "type"],
          "pathGroups": [
            { "pattern": "react", "group": "builtin", "position": "before" },
            { "pattern": "@/**", "group": "internal" }
          ],
          "pathGroupsExcludedImportTypes": ["react"],
          "newlines-between": "always",
          "alphabetize": { "order": "asc", "caseInsensitive": true }
        }
      ],
      
      // Tailwind CSS
      "tailwindcss/no-arbitrary-value": "warn",
      "tailwindcss/classnames-order": "warn",
      
      // File Naming Conventions
      "check-file/filename-naming-convention": [
        "error",
        {
          "src/components/**/*.tsx": "PASCAL_CASE",
          "src/pages/**/*.tsx": "PASCAL_CASE",
          "src/hooks/**/*.ts": "CAMEL_CASE",
          "src/services/**/*.ts": "CAMEL_CASE",
        },
        { "ignoreMiddleExtensions": true }
      ],

      "@typescript-eslint/prefer-nullish-coalescing": "off",

      // Default Restricted Imports
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@/db/database",
          message: "Please use repositories in @/db/repositories/ instead of direct database access."
        }]
      }]
    },
  },
  // ── Architectural Boundaries ──

  // Rule 1: Domain Layer — Complete Isolation
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/db/**/*", "**/db/**/*"], message: "Domain must not depend on db layer." },
          { group: ["@/services/**/*", "**/services/**/*"], message: "Domain must not depend on services." },
          { group: ["@/hooks/**/*", "**/hooks/**/*"], message: "Domain must not depend on hooks." },
          { group: ["@/pages/**/*", "**/pages/**/*"], message: "Domain must not depend on pages." },
          { group: ["@/components/**/*", "**/components/**/*"], message: "Domain must not depend on components." },
          { group: ["@/stores/**/*", "**/stores/**/*"], message: "Domain must not depend on stores." },
        ],
        paths: [
          { name: "react", message: "Domain must not depend on React." },
          { name: "react-dom", message: "Domain must not depend on React." },
        ]
      }]
    }
  },
  // Rule 2: Repository Layer — Only Domain + Infrastructure
  {
    files: ["src/db/**/*.{ts,tsx}"],
    ignores: ["src/db/**/*.test.{ts,tsx}", "src/db/repositories/__tests__/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/services/**/*", "**/services/**/*"], message: "Repository must not depend on services." },
          { group: ["@/hooks/**/*", "**/hooks/**/*"], message: "Repository must not depend on hooks." },
          { group: ["@/pages/**/*", "**/pages/**/*"], message: "Repository must not depend on pages." },
          { group: ["@/components/**/*", "**/components/**/*"], message: "Repository must not depend on components." },
          { group: ["@/stores/**/*", "**/stores/**/*"], message: "Repository must not depend on stores." },
        ]
      }]
    }
  },
  // Rule 2b: Application Layer — Ports and use cases never reach concrete infrastructure.
  {
    files: ["src/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/db/**/*", "**/db/**/*"], message: "Application use cases must depend on ports, not Dexie repositories." },
          { group: ["@/infrastructure/**/*", "**/infrastructure/**/*"], message: "Application use cases must not import concrete infrastructure adapters." },
        ],
        paths: [
          { name: "dexie", message: "Application use cases must not import Dexie." },
          { name: "react", message: "Application use cases must not import React." },
          { name: "@tanstack/react-query", message: "Application use cases must not import React Query." },
        ]
      }]
    }
  },
  // Rule 3: Domain services — never reach concrete persistence.
  {
    files: ["src/services/**/*.{ts,tsx}"],
    ignores: ["src/services/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/db/**/*", "**/db/**/*"], message: "Domain services must not depend on Dexie repositories; use an application port instead." },
          { group: ["@/infrastructure/**/*", "**/infrastructure/**/*"], message: "Domain services must not depend on concrete infrastructure." },
          { group: ["@/hooks/**/*", "**/hooks/**/*"], message: "Services must not depend on hooks." },
          { group: ["@/pages/**/*", "**/pages/**/*"], message: "Services must not depend on pages." },
          { group: ["@/components/**/*", "**/components/**/*"], message: "Services must not depend on components." },
          { group: ["@/stores/**/*", "**/stores/**/*"], message: "Services must not depend on stores." },
        ],
        paths: [
          { name: "react", message: "Services must not import React." },
          { name: "react-dom", message: "Services must not import React." },
        ]
      }]
    }
  },
  // Rule 3b: Infrastructure adapters must not call composition commands.
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/composition/**/*", "**/composition/**/*"], message: "Infrastructure adapters receive cross-use-case callbacks from the composition root instead of importing composition commands." },
        ]
      }]
    }
  },
  // Rule 4: Hooks must not reach persistence or concrete adapters.
  {
    files: ["src/hooks/**/*.{ts,tsx}"],
    ignores: ["src/hooks/useToast.ts", "src/hooks/use-toast.ts"], // shadcn UI infrastructure hooks
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/db/**/*", "**/db/**/*"], message: "Hooks must not access DB directly. Use services." },
          { group: ["@/infrastructure/**/*", "**/infrastructure/**/*"], message: "Hooks must invoke application/composition commands instead of infrastructure adapters." },
          { group: ["@/pages/**/*", "**/pages/**/*"], message: "Hooks must not depend on pages." },
          { group: ["@/components/**/*", "**/components/**/*"], message: "Hooks must not depend on components." },
        ],
        paths: [
          { name: "dexie", message: "Hooks must not import Dexie directly." },
        ]
      }]
    }
  },
  // Rule 5: Stores must not reach persistence or concrete adapters.
  {
    files: ["src/stores/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/db/**/*", "**/db/**/*"], message: "Stores must not access DB directly. Use services." },
          { group: ["@/infrastructure/**/*", "**/infrastructure/**/*"], message: "Stores must invoke application/composition commands instead of infrastructure adapters." },
          { group: ["@/pages/**/*", "**/pages/**/*"], message: "Stores must not depend on pages." },
          { group: ["@/components/**/*", "**/components/**/*"], message: "Stores must not depend on components." },
        ],
        paths: [
          { name: "dexie", message: "Stores must not import Dexie directly." },
        ]
      }]
    }
  },
  // Rule 6: Pages/components are presentation only: no persistence or concrete adapters.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "dexie", message: "Components and pages must not import Dexie." },
        ],
        patterns: [
          { group: ["@/db/**/*", "**/db/**/*"], message: "Components and pages must access data through application/composition commands, not the DB layer." },
          { group: ["@/infrastructure/**/*", "**/infrastructure/**/*"], message: "Components and pages must not import concrete infrastructure adapters." },
        ]
      }]
    }
  },
  // Exceptions for DB/service files that legitimately access database directly
  {
    files: [
      "src/db/repositories/**/*.{ts,tsx}",
      "src/db/DatabaseLifecycle.ts",
      "src/db/UserService.ts",
      "src/db/seed.ts",
      "src/db/fixtures.ts",
      "src/db/database.ts"
    ],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [] // Clear patterns for these files
      }]
    }
  },
  // Rule 8: Test files — Excluded from ALL architectural boundaries
  {
    files: [
      "tests/**/*.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
      "src/**/__tests__/**/*.{ts,tsx}",
      "src/test/**/*.{ts,tsx}"
    ],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react/jsx-no-literals": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "no-restricted-imports": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off"
    },
  },
);
