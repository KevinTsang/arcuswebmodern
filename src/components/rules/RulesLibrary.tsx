import { useCallback, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useSidePanel } from '@/components/SidePanel';
import { Accordion, AccordionPanel } from '@/components/shared/Accordion';
import { RulePanel } from './RulePanel';

interface RulesLibraryProps {
  placeId: string;
}

export function RulesLibrary({ placeId }: RulesLibraryProps) {
  const ruleTemplates = useAppSelector((s) => s.rules.ruleTemplates);
  const { openRight } = useSidePanel();

  // Group templates by category
  const categories = useMemo(() => {
    const map = new Map<string, Record<string, unknown>[]>();
    for (const tmpl of ruleTemplates) {
      const cats = tmpl['ruletmpl:categories'] as string[] | undefined;
      if (cats) {
        for (const cat of cats) {
          const list = map.get(cat) ?? [];
          list.push(tmpl);
          map.set(cat, list);
        }
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [ruleTemplates]);

  const handleTemplateClick = useCallback(
    (tmpl: Record<string, unknown>) => {
      openRight(<RulePanel template={tmpl} placeId={placeId} />);
    },
    [openRight, placeId],
  );

  if (ruleTemplates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-grouse">No rule templates available.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-grouse mb-4">
        Browse rule templates by category. Click a template to create a new rule.
      </p>
      <Accordion>
        {categories.map(([category, templates]) => (
          <AccordionPanel
            key={category}
            id={category}
            title={`${category} (${templates.length})`}
          >
            {templates.map((tmpl, i) => (
              <button
                key={i}
                onClick={() => handleTemplateClick(tmpl)}
                className="w-full text-left py-2.5 px-2 border-b border-pigeon last:border-b-0 hover:bg-pigeon/50 rounded transition-colors group flex items-center gap-2"
              >
                <span className="text-peacock opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none">+</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-swift">
                    {(tmpl['ruletmpl:name'] as string) ?? 'Unnamed template'}
                  </p>
                  {tmpl['ruletmpl:description'] ? (
                    <p className="text-xs text-grouse mt-0.5">
                      {String(tmpl['ruletmpl:description'])}
                    </p>
                  ) : null}
                </div>
              </button>
            ))}
          </AccordionPanel>
        ))}
      </Accordion>
    </div>
  );
}
