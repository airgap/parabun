import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor) {
	Widget($$anchor, { $$events: { click: () => console.log('clicked') } });
}