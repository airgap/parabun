import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Component from './component.svelte';

export default function Main($$anchor) {
	Component($$anchor, { name: 'world' });
}