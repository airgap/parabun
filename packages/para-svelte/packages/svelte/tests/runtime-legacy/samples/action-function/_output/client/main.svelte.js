import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>action</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const translations = { perform_action: 'Perform an Action' };

	function t(key) {
		return translations[key] || `{{${key}}}`;
	}

	let actionTransKey = $.prop($$props, 'actionTransKey', 12, 'perform_action');

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
			destroy() {
				node.removeEventListener('mouseenter', onMouseEnter);
				node.removeEventListener('mouseleave', onMouseLeave);
			}
		};
	}

	var $$exports = {
		get actionTransKey() {
			return actionTransKey();
		},

		set actionTransKey($$value) {
			actionTransKey($$value);
			$.flush();
		}
	};

	var button = root();

	$.action(button, ($$node, $$action_arg) => tooltip?.($$node, $$action_arg), () => t(actionTransKey()));
	$.append($$anchor, button);

	return $.pop($$exports);
}