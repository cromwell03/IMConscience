import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { CategoryDialog } from "./category-dialog";
import { deleteCategory, archiveCategory } from "@/lib/actions/category-actions";
import { Trash2, Archive } from "lucide-react";

export const metadata = { title: "Categories — Settings" };

export default async function CategoriesSettingsPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { name: "asc" },
  });

  const topLevel = (kind: string) => categories.filter((c) => c.kind === kind && !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CategoryDialog categories={categories} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(["EXPENSE", "INCOME"] as const).map((kind) => (
          <Card key={kind}>
            <CardHeader>
              <CardTitle>{kind === "EXPENSE" ? "Expense Categories" : "Income Categories"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {topLevel(kind).map((cat) => (
                <div key={cat.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <ConfirmActionButton
                        variant="ghost"
                        size="icon"
                        action={archiveCategory.bind(null, cat.id)}
                        confirmMessage={`Archive "${cat.name}"?`}
                      >
                        <Archive className="h-3.5 w-3.5 text-muted" />
                      </ConfirmActionButton>
                      <ConfirmActionButton
                        variant="ghost"
                        size="icon"
                        action={deleteCategory.bind(null, cat.id)}
                        confirmMessage={`Delete "${cat.name}"? Only possible if unused.`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted" />
                      </ConfirmActionButton>
                    </div>
                  </div>
                  {childrenOf(cat.id).length > 0 && (
                    <div className="ml-4 mt-1 flex flex-col gap-1">
                      {childrenOf(cat.id).map((child) => (
                        <div key={child.id} className="flex items-center justify-between text-xs text-muted">
                          <span>— {child.name}</span>
                          <ConfirmActionButton
                            variant="ghost"
                            size="icon"
                            action={deleteCategory.bind(null, child.id)}
                            confirmMessage={`Delete "${child.name}"?`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </ConfirmActionButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
