export const formatDate = (value: string | Date, short = false) =>
  new Intl.DateTimeFormat(
    'id-ID',
    short
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { day: 'numeric', month: 'long', year: 'numeric' },
  ).format(new Date(value))
