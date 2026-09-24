const invoke = window.__TAURI__?.core?.invoke;
const repo = document.querySelector('#repo');
const pathStatus = document.querySelector('#path-status');
const output = document.querySelector('#output');
const operationsRoot = document.querySelector('#operations');
let validatedPath = '';

const operations = [
  ['senten.inspect', 'Inspect', 'Inspect Senten architecture and repository state.'],
  ['senten.graph', 'Graph', 'Render Senten graph output for the selected repository.'],
  ['senten.evidence', 'Evidence', 'Read Senten evidence output.'],
  ['senten.evidence-test', 'Evidence Test', 'Run Senten deterministic evidence tests.'],
  ['senten.report', 'Report', 'Generate Senten report output.'],
  ['senten.assurance', 'Assurance', 'Inspect Senten assurance output.'],
  ['git.status', 'Git Status', 'Read repository Git status.'],
  [
    'docker.version',
    'Docker Version',
    'Check the local Docker client used by isolated verification.',
  ],
];

function requireInvoke() {
  if (!invoke)
    throw new Error(
      'Tauri native bridge is unavailable. This surface must run inside LaunchProof Desktop.',
    );
}

async function validate() {
  requireInvoke();
  validatedPath = await invoke('validate_repository_path', { path: repo.value });
  pathStatus.textContent = `Authorized repository: ${validatedPath}`;
  pathStatus.className = 'ok';
}

document.querySelector('#validate').addEventListener('click', async () => {
  try {
    await validate();
  } catch (error) {
    validatedPath = '';
    pathStatus.textContent = String(error);
    pathStatus.className = 'error';
  }
});

document.querySelector('#clear').addEventListener('click', () => {
  output.textContent = '';
});

for (const [id, label, description] of operations) {
  const button = document.createElement('button');
  button.className = 'operation';
  button.innerHTML = `<strong>${label}</strong><span>${description}</span><code>${id}</code>`;
  button.addEventListener('click', async () => {
    try {
      if (!validatedPath || repo.value !== validatedPath) await validate();
      output.textContent = `Running ${id}…`;
      const result = await invoke('run_native_operation', {
        operation: id,
        repositoryPath: validatedPath,
      });
      output.textContent = [
        `operation: ${result.operation}`,
        `ok: ${result.ok}`,
        `exitCode: ${result.exitCode ?? 'n/a'}`,
        `timedOut: ${result.timedOut}`,
        '',
        result.stdout || '',
        result.stderr ? `\n[stderr]\n${result.stderr}` : '',
      ].join('\n');
    } catch (error) {
      output.textContent = `LaunchProof desktop error:\n${String(error)}`;
    }
  });
  operationsRoot.appendChild(button);
}
