import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1></h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let display = $.prop($$props, 'display', 12);
	let target = $.prop($$props, 'target', 12);

	function insert(node, text) {
		function onClick() {
			node.textContent = text;
		}

		node.addEventListener('click', onClick);

		return {
			destroy() {
				node.removeEventListener('click', onClick);
			}
		};
	}

	var $$exports = {
		get display() {
			return display();
		},

		set display($$value) {
			display($$value);
			$.flush();
		},

		get target() {
			return target();
		},

		set target($$value) {
			target($$value);
			$.flush();
		}
	};

	var h1 = root();

	$.action(h1, ($$node, $$action_arg) => insert?.($$node, $$action_arg), () => display() ? `Hello ${target()}` : '');
	$.append($$anchor, h1);

	return $.pop($$exports);
}