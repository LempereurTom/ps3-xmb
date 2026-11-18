// health.json stores just the last command and a timestamp in whole seconds.
// Keep it current during a held direction without one backend write per repeat.
export function createHealthReporter(send: (event: string, value: string | number) => void) {
  let lastInput: string | number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function flushInput() {
    clearTimeout(timer);
    timer = undefined;
    if (lastInput === undefined) return;
    const value = lastInput;
    lastInput = undefined;
    send('last_input', value);
  }

  function report(event: string, value: string | number) {
    if (event !== 'last_input') {
      send(event, value);
      return;
    }
    lastInput = value;
    timer ??= setTimeout(flushInput, 1000);
  }

  return { report, flushInput };
}
