import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<p>`);
	$$renderer.push(async () => $.escape((await $.save(Promise.resolve('hello')))()));
	$$renderer.push(`</p>`);
}