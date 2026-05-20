import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import App from './app.svelte';

export default function Main($$renderer) {
	$$renderer.push(`<!--[!-->`);

	{}

	$$renderer.push(`<!--]-->`);
}