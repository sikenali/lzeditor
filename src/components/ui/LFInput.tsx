export { LFSCombo, type LFSComboProps, type LFSComboOption } from './LFSCombo'
export { LFSInput, type LFSInputProps } from './LFSInput.internal'

// LFSSelect is a re-export of LFSCombo for backward compatibility
import { LFSCombo } from './LFSCombo'
import type { LFSComboProps } from './LFSCombo'
export const LFSSelect = LFSCombo
export type LFSSelectProps = LFSComboProps
