const fs = require('fs');

function addDroppable(file) {
   let c = fs.readFileSync(file, 'utf8');
   if (!c.includes('useDroppable')) {
       c = c.replace(/import { useSortable } from '@dnd-kit\/sortable';/, "import { useSortable, useDroppable } from '@dnd-kit/sortable';");
       // Wait, useDroppable is from @dnd-kit/core
       c = c.replace(/import { DndContext(.*?) } from '@dnd-kit\/core';/, "import { DndContext$1, useDroppable } from '@dnd-kit/core';");
       
       const droppableComponent = `
const DroppableList = ({ id, children, style }: {id: string, children: React.ReactNode, style?: React.CSSProperties}) => {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} id={id} style={style}>{children}</div>;
};
`;
       c = c.replace(/const SortableRow/, droppableComponent + '\const SortableRow');
       c = c.replace(/<div id="prep-list"(.*?)>/, '<DroppableList id="prep-list" style={{minHeight: "40px"}}>');
       c = c.replace(/<\/div>\s*<div className="list-header"(.*?)>Ассортимент<\/div>/, '</DroppableList>\n<div className="list-header"$1>Ассортимент</div>');
       c = c.replace(/<div id="assortment-list"(.*?)>/, '<DroppableList id="assortment-list" style={{minHeight: "40px"}}>');
       c = c.replace(/<\/div>\s*<div style={{padding: '12px 0 4px'/, '</DroppableList>\n<div style={{padding: "12px 0 4px"');

       fs.writeFileSync(file, c);
   }
}

addDroppable('src/presentation/pages/PreparationPage.tsx');

let s = fs.readFileSync('src/presentation/pages/StorePage.tsx', 'utf8');
if (!s.includes('useDroppable')) {
    s = s.replace(/import { DndContext(.*?) } from '@dnd-kit\/core';/, "import { DndContext$1, useDroppable } from '@dnd-kit/core';");
       const droppableComponent = `
const DroppableList = ({ id, children, style }: {id: string, children: React.ReactNode, style?: React.CSSProperties}) => {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} id={id} style={style}>{children}</div>;
};
`;
    s = s.replace(/const SortableRow/, droppableComponent + '\const SortableRow');
    s = s.replace(/<div id="unpicked-list"(.*?)>/, '<DroppableList id="unpicked-list" style={{minHeight: "40px"}}>');
    s = s.replace(/<\/div>\s*<div className="list-header"(.*?)>В корзине<\/div>/, '</DroppableList>\n<div className="list-header"$1>В корзине</div>');
    s = s.replace(/<div id="picked-list"(.*?)>/, '<DroppableList id="picked-list" style={{minHeight: "40px"}}>');
    s = s.replace(/<\/div>\s*<div style={{padding: '12px 0 4px'/, '</DroppableList>\n<div style={{padding: "12px 0 4px"');
    fs.writeFileSync('src/presentation/pages/StorePage.tsx', s);
}
