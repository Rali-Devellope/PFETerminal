from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'message': _get_message(response.data),
                'details': response.data,
            }
        }
    return response


def _get_message(data):
    if isinstance(data, dict):
        if 'detail' in data:
            return str(data['detail'])
        return str(next(iter(data.values()), 'Erreur'))
    if isinstance(data, list):
        return str(data[0]) if data else 'Erreur'
    return str(data)


def success_response(data=None, message='', count=None, status_code=status.HTTP_200_OK):
    payload = {'success': True, 'data': data, 'message': message}
    if count is not None:
        payload['count'] = count
    return Response(payload, status=status_code)


def error_response(message, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'error': message}, status=status_code)
