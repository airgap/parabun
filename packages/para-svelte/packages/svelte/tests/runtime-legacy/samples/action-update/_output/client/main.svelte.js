import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>action</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let text = $.prop($$props, 'text', 12, 'Perform an Action');

	function checkForCtrl(event) {
		if (event.ctrlKey) {
			text('Perform an augmented Action');
		} else {
			text('Perform an Action');
		}
	}

	function tooltip(node, text) {
		let tooltip = null;

		function onMouseEnter() {
			tooltip = document.createElement('div');
			tooltip.classList.add('tooltip');
			tooltip.textContent = text;
			node.parentNode.appendChild(tooltip);
		}

		function onMouseLeave() {
			if (!tooltip) return;

			tooltip.remove();
			tooltip = null;
		}

		node.addEventListener('mouseenter', onMouseEnter);
		node.addEventListener('mouseleave', onMouseLeave);

		return {
			update(text) {
				if (tooltip) tooltip.textContent = text;
			},

			destroy() {
				node.removeEventListener('mouseenter', onMouseEnter);
				node.removeEventListener('mouseleave', onMouseLeave);
			}
		};
	}

	var $$exports = {
		get text() {
			return text();
		},

		set text($$value) {
			text($$value);
			$.flush();
		}
	};

	var button = root();

	$.event('keydown', $.window, checkForCtrl);
	$.event('keyup', $.window, checkForCtrl);
	$.action(button, ($$node, $$action_arg) => tooltip?.($$node, $$action_arg), text);
	$.append($$anchor, button);

	return $.pop($$exports);
}