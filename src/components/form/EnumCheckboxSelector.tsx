import { UseFormReturn, FieldValues, Path } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface EnumCheckboxSelectorProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  items: string[];
  getLabel: (item: string) => string;
}

export function EnumCheckboxSelector<T extends FieldValues>({
  form,
  name,
  label,
  items,
  getLabel,
}: EnumCheckboxSelectorProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <FormField
                key={item}
                control={form.control}
                name={name}
                render={({ field }) => {
                  return (
                    <FormItem
                      key={item}
                      className="flex flex-row items-center space-x-1.5 space-y-0"
                    >
                      <FormControl>
                        <Checkbox
                          checked={(field.value as string[])?.includes(item)}
                          onCheckedChange={(checked) => {
                            const current = (field.value as string[]) || [];
                            return checked
                              ? field.onChange([...current, item])
                              : field.onChange(
                                  current.filter((value) => value !== item)
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-body-sm cursor-pointer font-normal">
                        {getLabel(item)}
                      </FormLabel>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
