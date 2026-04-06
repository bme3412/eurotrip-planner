'use client';

import { motion } from 'framer-motion';

/**
 * UserMessage - Renders a user message bubble
 */
export default function UserMessage({ content }) {
  return (
    <div className="flex justify-end">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-[80%] bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm"
      >
        <p className="text-[15px] leading-relaxed">{content}</p>
      </motion.div>
    </div>
  );
}
