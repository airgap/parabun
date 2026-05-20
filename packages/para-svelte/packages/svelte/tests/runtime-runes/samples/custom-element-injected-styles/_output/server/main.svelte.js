import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import './Thing.svelte';

export default function Main($$renderer) {
	$$renderer.push(`<my-thing></my-thing>`);
}