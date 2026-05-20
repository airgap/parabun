import * as $ from 'svelte/internal/server';
import Folder from './Folder.svelte';

export default function Main($$renderer, $$props) {
	let folder = $$props['folder'];

	Folder($$renderer, { dir: 'a' });
	$.bind_props($$props, { folder });
}