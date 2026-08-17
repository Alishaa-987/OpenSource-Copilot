import { killPort } from '@nx/node/utils';

declare global {
  var __TEARDOWN_MESSAGE__: string;
}

module.exports = async function (): Promise<void> {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await killPort(port);
  console.log(globalThis.__TEARDOWN_MESSAGE__ ?? '\nTearing down...\n');
};
