import * as $ from 'svelte/internal/server';
import RawMustache from './RawMustache.svelte';

export default function Main($$renderer) {
	let content;
	let content1 = `<p>First line</p>`;
	let content2 = `<p>Another first line</p>`;
	let show = false;

	$: content = show ? content1 : content2;

	$$renderer.push(`<button>Switch</button> `);
	RawMustache($$renderer, { content });
	$$renderer.push(`<!----> <p>This line should be last.</p>`);
}