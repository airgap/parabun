import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<div><!-- test1 --><!-- test2 --></div> p <div><!-- test1 --><!-- test2 --></div>`);
}