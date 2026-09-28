const chunk = <Item,>(items: Item[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

export const executeWithConcurrencyLimit = <Item, Result>(
  items: Item[],
  limit: number,
  run: (item: Item) => Promise<Result>,
) =>
  chunk(items, limit).reduce<Promise<Result[]>>(
    async (previous, batch) => [...(await previous), ...(await Promise.all(batch.map(run)))],
    Promise.resolve([]),
  )
