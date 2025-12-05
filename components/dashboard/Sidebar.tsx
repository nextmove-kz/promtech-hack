import { DefectDetailsPanel } from './DefectDetailsPanel'
import { ObjectCardList } from './ObjectCardList'

interface SidebarProps {
  selectedDefect: string | null
  viewMode: 'map' | 'table'
  onDefectSelect: (defectId: string) => void
  onClosePanel: () => void
  onExpandTable: () => void
}

export function Sidebar({
  selectedDefect,
  viewMode,
  onDefectSelect,
  onClosePanel,
  onExpandTable,
}: SidebarProps) {
  if (selectedDefect) {
    return (
      <DefectDetailsPanel defectId={selectedDefect} onClose={onClosePanel} />
    )
  }

  if (viewMode === 'map') {
    return (
      <ObjectCardList
        onCardSelect={onDefectSelect}
        onExpandTable={onExpandTable}
        selectedId={selectedDefect}
      />
    )
  }

  return null
}

