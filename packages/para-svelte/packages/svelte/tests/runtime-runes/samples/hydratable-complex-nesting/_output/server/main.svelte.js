import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { hydratable } from "svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { environment } = $$props;
		const value = hydratable("environment", () => Promise.resolve({ nested: Promise.resolve({ environment }) }));

		$$renderer.push(`<p>The current environment is: `);
		$$renderer.push(async () => $.escape((await $.save(value.then((res) => res.nested).then((res) => res.environment)))()));
		$$renderer.push(`</p>`);
	});
}