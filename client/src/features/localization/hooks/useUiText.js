import { useCallback } from 'react'
import { useLocalization } from './useLocalization'
import { translateUiText } from '../dictionaries/uiMessages'

export function useUiText() {
  const { locale, remoteUi } = useLocalization()
  return useCallback((text, values) => translateUiText(text, locale, values, remoteUi), [locale, remoteUi])
}
