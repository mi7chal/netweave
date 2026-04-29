import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";

interface CrudRowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  align?: "start" | "center" | "end";
}

export function CrudRowActions({
  onEdit,
  onDelete,
  align = "end",
}: CrudRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuItem onClick={onEdit}>
          <Edit2 />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
