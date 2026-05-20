import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Countdown from './Countdown.svelte';

export default function Main($$anchor) {
	Countdown($$anchor, { count: 5 });
}