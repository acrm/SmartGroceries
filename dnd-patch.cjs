const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert useDroppable into DndKit imports
if (!code.includes('useDroppable')) {
    code = code.replace(/useSensors,([^a-zA-Z0-9])/s, 'useSensors,$1  useDroppable,$1');
}

// Add DroppableContainer wrapper
const droppableCode = `
function DroppableList({
  id,
  items,
  children,
  className,
}: {
  id: string
  items: ID[]
  children: ReactNode
  className?: string
}) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className={className}>
        {children}
      </div>
    </SortableContext>
  )
}
`;
if (!code.includes('DroppableList')) {
    code = code.replace(/function SortableRow/, droppableCode + '\nfunction SortableRow');
}

fs.writeFileSync('src/App.tsx', code, 'utf-8');
console.log('Added useDroppable and DroppableList');
