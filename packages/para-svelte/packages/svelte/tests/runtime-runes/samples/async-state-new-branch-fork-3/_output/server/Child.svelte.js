import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	let { x } = $$props;

	$$renderer.push(`<!---->${$.escape(x)}
${$.escape(JSON.stringify(x))} `);

	if (x === 'universe') {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`universe`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`world`);
	}

	$$renderer.push(`<!--]--> `);

	if (JSON.stringify(x) === '"universe"') {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`universe`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`world`);
	}

	$$renderer.push(`<!--]--> `);
	$$renderer.push(async () => $.escape(await Promise.resolve(x)));

	$$renderer.push(`
`);

	$$renderer.push(async () => $.escape(await Promise.resolve(JSON.stringify(x))));
}