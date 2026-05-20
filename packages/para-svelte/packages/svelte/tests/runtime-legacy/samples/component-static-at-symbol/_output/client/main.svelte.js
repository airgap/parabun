import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Email from './Email.svelte';

export default function Main($$anchor) {
	Email($$anchor, { address: 'hello@example.com' });
}