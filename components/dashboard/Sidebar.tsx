import { DiagnosticDetailsPanel } from './DiagnosticDetailsPanel'
import { ObjectCardList } from './ObjectCardList'

interface SidebarProps {
  selectedObjectId: string | null
  viewMode: 'map' | 'table'
  onObjectSelect: (objectId: string) => void
  onClosePanel: () => void
  onExpandTable: () => void
}

export function Sidebar({
  selectedObjectId,
  viewMode,
  onObjectSelect,
  onClosePanel,
  onExpandTable,
}: SidebarProps) {
  if (selectedObjectId) {
    return (
      <DiagnosticDetailsPanel objectId={selectedObjectId} onClose={onClosePanel} />
    )
  }

  if (viewMode === 'map') {
    return (
      <ObjectCardList
        onCardSelect={onObjectSelect}
        onExpandTable={onExpandTable}
        selectedId={selectedObjectId}
      />
    )
  }

  return null
}

