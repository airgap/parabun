import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Link from './Link.svelte';

export default function Main($$anchor) {
	Link($$anchor, { x: true, href: '/cool' });
}