import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Anchor from './Anchor.svelte';

export default function Main($$anchor) {
	Anchor($$anchor, {});
}