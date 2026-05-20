import * as $ from 'svelte/internal/server';
import { Widget } from './Widget.svelte';

export default function Main($$renderer) {
	let widgets = [Widget];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(widgets);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let LazyWidget = each_array[$$index];

		LazyWidget.Tooltip($$renderer, {});
	}

	$$renderer.push(`<!--]-->`);
}