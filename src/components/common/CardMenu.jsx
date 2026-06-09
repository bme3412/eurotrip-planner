'use client';

import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import Link from 'next/link';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

/**
 * Small "⋯" overflow menu for cards. Items are objects:
 *   { label, href }                       → link item
 *   { label, onClick }                    → button item
 *   { label, onClick, danger: true }      → destructive (red)
 *   { divider: true }                     → separator
 */
export default function CardMenu({ items = [], label = 'More actions' }) {
  if (!items.length) return null;
  return (
    <Menu as="div" className="relative ml-auto">
      <MenuButton
        aria-label={label}
        className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 data-[open]:bg-gray-100"
      >
        <EllipsisHorizontalIcon className="size-5" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-50 mt-1 w-44 origin-top-right rounded-xl border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
      >
        {items.map((item, i) =>
          item.divider ? (
            <div key={`d${i}`} className="my-1 h-px bg-gray-100" />
          ) : item.href ? (
            <MenuItem key={item.label}>
              <Link
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 data-[focus]:bg-gray-50"
              >
                {item.icon && <item.icon className="size-4 text-gray-400" />}
                {item.label}
              </Link>
            </MenuItem>
          ) : (
            <MenuItem key={item.label}>
              <button
                type="button"
                onClick={item.onClick}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium data-[focus]:bg-gray-50 ${item.danger ? 'text-red-600 data-[focus]:bg-red-50' : 'text-gray-700'}`}
              >
                {item.icon && <item.icon className={`size-4 ${item.danger ? 'text-red-400' : 'text-gray-400'}`} />}
                {item.label}
              </button>
            </MenuItem>
          )
        )}
      </MenuItems>
    </Menu>
  );
}
