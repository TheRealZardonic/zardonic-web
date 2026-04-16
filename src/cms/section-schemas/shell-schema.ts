/**
 * Shell Section Schema
 *
 * Defines the admin-editable fields for ShellSection (terminal / boot sequence).
 * The shell section renders an interactive terminal UI with configurable text output.
 */

import { registerAdminSection } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

interface ShellSectionData {
  hackingTexts: string[]
  codeFragments: string[]
  bootLabel: string
  titleLabel: string
  stageMessages: string[]
  buildInfo: string
  platformInfo: string
  connectionStatus: string
}

const shellSectionSchema: AdminSectionSchema<ShellSectionData> = {
  sectionId: 'shell',
  group: 'configuration',
  label: 'Terminal / Shell',
  icon: 'Terminal',
  description: 'The terminal boot sequence section. Configure the animated text output and system messages.',
  supportsPreview: false,
  fields: [
    {
      key: 'bootLabel',
      type: 'text',
      label: 'Boot Label',
      tooltip: 'Label shown at the start of the boot sequence (e.g. "SYSTEM BOOT").',
      placeholder: 'SYSTEM BOOT',
      group: 'Boot Sequence',
      validation: { maxLength: 100 },
    },
    {
      key: 'titleLabel',
      type: 'text',
      label: 'Title Label',
      tooltip: 'Title shown prominently during the boot sequence.',
      placeholder: 'ZARDONIC SYSTEM v1.0',
      group: 'Boot Sequence',
      validation: { maxLength: 100 },
    },
    {
      key: 'buildInfo',
      type: 'text',
      label: 'Build Info',
      tooltip: 'Build information text shown in the terminal (e.g. "BUILD 2025.04.01").',
      placeholder: 'BUILD 2025.04.01',
      group: 'Boot Sequence',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'platformInfo',
      type: 'text',
      label: 'Platform Info',
      tooltip: 'Platform info string shown in the terminal (e.g. "LINUX x86_64").',
      placeholder: 'LINUX x86_64',
      group: 'Boot Sequence',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'connectionStatus',
      type: 'text',
      label: 'Connection Status',
      tooltip: 'Connection status string shown in the terminal (e.g. "SECURE HTTPS").',
      placeholder: 'SECURE HTTPS',
      group: 'Boot Sequence',
      disclosure: 'advanced',
      validation: { maxLength: 100 },
    },
    {
      key: 'stageMessages',
      type: 'array',
      label: 'Stage Messages',
      tooltip: 'Sequential messages displayed during the boot sequence stages.',
      group: 'Boot Sequence',
      disclosure: 'advanced',
      arrayItemSchema: [
        {
          key: 'message',
          type: 'text',
          label: 'Stage Message',
          placeholder: 'Initializing...',
          validation: { maxLength: 100 },
        },
      ],
    },
    {
      key: 'hackingTexts',
      type: 'array',
      label: 'Hacking Texts',
      tooltip: 'Lines of pseudo-code or "hacking" text scrolled in the terminal animation.',
      group: 'Terminal Content',
      disclosure: 'advanced',
      arrayItemSchema: [
        {
          key: 'line',
          type: 'text',
          label: 'Line',
          placeholder: '> DECRYPTING PAYLOAD...',
          validation: { maxLength: 200 },
        },
      ],
    },
    {
      key: 'codeFragments',
      type: 'array',
      label: 'Code Fragments',
      tooltip: 'Short code snippets mixed into the terminal output for visual effect.',
      group: 'Terminal Content',
      disclosure: 'advanced',
      arrayItemSchema: [
        {
          key: 'fragment',
          type: 'text',
          label: 'Code Fragment',
          placeholder: 'import { bass } from "zardonic"',
          validation: { maxLength: 200 },
        },
      ],
    },
  ],
  fieldGroups: [
    { id: 'Boot Sequence', label: 'Boot Sequence', defaultExpanded: true },
    { id: 'Terminal Content', label: 'Terminal Content', defaultExpanded: false },
  ],
  getDefaultData: () => ({
    hackingTexts: [],
    codeFragments: [],
    bootLabel: 'SYSTEM BOOT',
    titleLabel: '',
    stageMessages: [],
    buildInfo: '',
    platformInfo: '',
    connectionStatus: '',
  }),
}

registerAdminSection(shellSectionSchema)

export { shellSectionSchema }
