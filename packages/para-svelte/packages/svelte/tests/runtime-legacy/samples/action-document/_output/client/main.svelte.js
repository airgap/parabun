import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor) {
	let container = $.mutable_source();

	function tooltip(node, text) {
		let tooltip = null;

		function onVisibilityChange() {
			tooltip = document.createElement('div');
			tooltip.classList.add('tooltip');
			tooltip.textContent = text;
			$.get(container).appendChild(tooltip);
		}

		node.addEventListener('visibilitychange', onVisibilityChange);

		return {
			destroy() {
				node.removeEventListener('visibilitychange', onVisibilityChange);
			}
		};
	}

	var div = root();

	$.action($.document, ($$node, $$action_arg) => tooltip?.($$node, $$action_arg), () => 'Perform an Action');
	$.bind_this(div, ($$value) => $.set(container, $$value), () => $.get(container));
	$.append($$anchor, div);
}