import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
// import js from "@eslint/js"; // Optional: include recommended JS rules

// Note: parser/parserOptions might be needed depending on project specifics,
// but we start without them for a JS project as Next's plugin might handle it.

const eslintConfig = [
  // Optional: js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx,mjsx}"], // Adjust files as needed
    plugins: {
      react: reactPlugin,
      "react-hooks": hooksPlugin,
      "@next/next": nextPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, // Add node globals if needed
        React: "readonly", // Define React globally if needed
      },
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Apply recommended rules
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,

      // Add/override custom rules below if needed
      "react/react-in-jsx-scope": "off", // Often not needed with Next.js/React 17+
      "react/prop-types": "off", // Disable prop-types if using TS or prefer not to use them
      "react/no-unknown-property": "off", // Temporarily disable due to jsx/global errors
    },
    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },
  },
  {
    // Ignores configuration - adjust as needed
    ignores: [
        ".next/",
        "node_modules/",
        // Add other ignored files/directories
    ],
  }
];

export default eslintConfig;
