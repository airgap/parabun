import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { children, push } = $$props;
		var message;
		var $$promises = $$renderer.run([async () => message = await push('hello from child')]);

		$$renderer.push(`<p>message: `);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(message)));
		$$renderer.push(`</p> `);
		children($$renderer);
		$$renderer.push(`<!---->`);
	});
}